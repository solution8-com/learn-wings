import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { SearchFilter, FilterConfig } from '@/components/ui/search-filter';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Course, CourseLevel } from '@/lib/types';
import { BookOpen, Plus, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CoursesManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<CourseLevel>('basic');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  
  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (data) setCourses(data as Course[]);
    setLoading(false);
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const { error } = await supabase.from('courses').insert({
      title, description, level, thumbnail_url: thumbnailUrl, created_by_user_id: user?.id, is_published: false,
    });
    if (error) {
      toast({ title: 'Failed to create course', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Course created!' });
      setCreateOpen(false); setTitle(''); setDescription(''); setLevel('basic'); setThumbnailUrl(null);
      fetchCourses();
    }
    setCreating(false);
  };

  const togglePublish = async (course: Course) => {
    await supabase.from('courses').update({ is_published: !course.is_published }).eq('id', course.id);
    fetchCourses();
  };

  const openDeleteDialog = (course: Course) => {
    setCourseToDelete(course);
    setDeleteOpen(true);
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('courses').delete().eq('id', courseToDelete.id);
    if (error) {
      toast({ title: 'Failed to delete course', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Course deleted' });
      setDeleteOpen(false);
      setCourseToDelete(null);
      fetchCourses();
    }
    setDeleting(false);
  };

  const levelColors = { basic: 'bg-green-100 text-green-800', intermediate: 'bg-yellow-100 text-yellow-800', advanced: 'bg-red-100 text-red-800' };

  const courseFilters: FilterConfig[] = [
    {
      key: 'level',
      label: 'Level',
      options: [
        { value: 'basic', label: 'Basic' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
      ],
    },
  ];

  const filterValues = { level: levelFilter, status: statusFilter };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'level') setLevelFilter(value);
    if (key === 'status') setStatusFilter(value);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setLevelFilter('all');
    setStatusFilter('all');
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = searchQuery === '' ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = levelFilter === 'all' || course.level === levelFilter;

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'published' && course.is_published) ||
      (statusFilter === 'draft' && !course.is_published);

    return matchesSearch && matchesLevel && matchesStatus;
  });

  if (loading) return <AppLayout title="Courses"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div></AppLayout>;

  return (
    <AppLayout title="Course Manager" breadcrumbs={[{ label: 'Courses' }]}>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <SearchFilter
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search courses..."
          filters={courseFilters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          className="flex-1"
        />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Create Course</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Course</DialogTitle><DialogDescription>Add a new course to the platform.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                <FileUpload
                  bucket="lms-assets"
                  folder="thumbnails"
                  accept="image"
                  value={thumbnailUrl}
                  onChange={(url) => setThumbnailUrl(url)}
                  maxSizeMB={10}
                />
              </div>
              <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Course description" /></div>
              <div className="space-y-2"><Label>Level</Label>
                <Select value={level} onValueChange={(v) => setLevel(v as CourseLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="basic">Basic</SelectItem><SelectItem value="intermediate">Intermediate</SelectItem><SelectItem value="advanced">Advanced</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={creating}>{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {filteredCourses.length === 0 ? (
        <EmptyState 
          icon={<BookOpen className="h-6 w-6" />} 
          title={searchQuery || levelFilter !== 'all' || statusFilter !== 'all' ? "No matching courses" : "No courses yet"} 
          description={searchQuery || levelFilter !== 'all' || statusFilter !== 'all' ? "Try adjusting your filters." : "Create your first course."} 
          action={!searchQuery && levelFilter === 'all' && statusFilter === 'all' ? <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Course</Button> : undefined} 
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/app/admin/courses/${course.id}`)}
            >
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="aspect-video object-cover" />
              ) : (
                <div className="aspect-video bg-gradient-to-br from-primary/80 to-primary" />
              )}
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-display font-semibold">{course.title}</h3>
                  <Badge className={levelColors[course.level]}>{course.level}</Badge>
                </div>
                <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch checked={course.is_published} onCheckedChange={() => togglePublish(course)} />
                    <span className="text-sm">{course.is_published ? 'Published' : 'Draft'}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); openDeleteDialog(course); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently delete <strong>"{courseToDelete?.title}"</strong> and all associated data including:
              </p>
              <ul className="list-disc list-inside text-sm">
                <li>All modules and lessons</li>
                <li>All learner enrollments and progress</li>
                <li>All quiz attempts and reviews</li>
              </ul>
              <p className="font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
